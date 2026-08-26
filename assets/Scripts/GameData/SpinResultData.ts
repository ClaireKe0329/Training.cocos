import { SymbolType } from './SymbolType';
import { ILineResultData } from './LineResultData';

// 保存單局 Spin 的盤面結果
export class SpinResultData
{
    public readonly SlotGrids: SymbolType[][];
    public readonly LineResults: ILineResultData[];
    public readonly TotalScore: number;

    public constructor( slotGrids: SymbolType[][], lineResults: ILineResultData[], totalScore: number )
    {
        this.SlotGrids = slotGrids.map( ( reelSymbols: SymbolType[] ): SymbolType[] => [ ...reelSymbols ] );
        // 複製每條中獎線與位置，避免外部修改來源資料後影響本局結果
        this.LineResults = lineResults.map( ( lineResult: ILineResultData ): ILineResultData => ( {
            PaylineIndex: lineResult.PaylineIndex,
            SymbolType: lineResult.SymbolType,
            MatchCount: lineResult.MatchCount,
            WinningPositions: lineResult.WinningPositions.map( ( position ) => ( {
                ReelIndex: position.ReelIndex,
                RowIndex: position.RowIndex,
            } ) ),
            Score: lineResult.Score,
        } ) );
        this.TotalScore = totalScore;
    }
}
