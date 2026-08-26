import { SpinResultData } from '../GameData/SpinResultData';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { ILineResultData } from '../GameData/LineResultData';
import { GameUtility } from '../GameUtility/GameUtility';
import { ScoreCalculator } from './ScoreCalculator';
import { SpinResultChecker } from './SpinResultChecker';

// 定義單局 Spin Result 的取得方式；沒有合法結果時回傳 null
export interface ISpinResultProvider
{
    GetSpinResult( bet: number ): SpinResultData | null;
}

// 提供本機 Spin Result
export class LocalSpinResultProvider implements ISpinResultProvider
{
    // 判斷隨機盤面中的所有中獎 Payline
    private _spinResultChecker: SpinResultChecker = new SpinResultChecker();

    // 計算目前單注對應的各線得分與總得分
    private _scoreCalculator: ScoreCalculator = new ScoreCalculator();

    public GetSpinResult( bet: number ): SpinResultData
    {
        const slotGrids: SymbolType[][] = this.generateSlotGrids();
        const lineResults: ILineResultData[] = this._spinResultChecker.CheckLineResults( slotGrids );
        const totalScore: number = this._scoreCalculator.CalculateScores( bet, lineResults );

        return new SpinResultData( slotGrids, lineResults, totalScore );
    }

    // 隨機產生單局盤面
    private generateSlotGrids(): SymbolType[][]
    {
        const slotGrids: SymbolType[][] = [];

        for ( let columnIndex: number = 0; columnIndex < GameUtility.GetSlotColumnCount(); columnIndex++ )
        {
            const reelSymbols: SymbolType[] = [];

            for ( let rowIndex: number = 0; rowIndex < GameUtility.GetSlotRowCount(); rowIndex++ )
            {
                reelSymbols.push( this.getRandomSymbol() );
            }

            slotGrids.push( reelSymbols );
        }

        return slotGrids;
    }

    // 隨機取得一個有效的 SymbolType
    private getRandomSymbol(): SymbolType
    {
        const randomIndex: number = Math.floor( Math.random() * SYMBOL_TYPE_LIST.length );
        return SYMBOL_TYPE_LIST[ randomIndex ];
    }
}
