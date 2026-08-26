import { SymbolType } from './SymbolType';
import { IWinResultData } from './WinResultData';

// 保存單局 Spin 的盤面結果
export class SpinResultData
{
    public readonly SlotGrids: SymbolType[][];
    public readonly WinResults: IWinResultData[];
    public readonly TotalScore: number;

    public constructor( slotGrids: SymbolType[][], winResults: IWinResultData[], totalScore: number )
    {
        this.SlotGrids = slotGrids.map( ( reelSymbols: SymbolType[] ): SymbolType[] => [ ...reelSymbols ] );
        // 複製每筆中獎資料與位置，避免外部修改來源資料後影響本局結果
        this.WinResults = winResults.map( ( winResult: IWinResultData ): IWinResultData => ( {
            SymbolType: winResult.SymbolType,
            MatchCount: winResult.MatchCount,
            WinningPositions: winResult.WinningPositions.map( ( position ) => ( {
                ReelIndex: position.ReelIndex,
                RowIndex: position.RowIndex,
            } ) ),
        } ) );
        this.TotalScore = totalScore;
    }
}
